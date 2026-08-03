# Genera las plantillas de correo de Supabase desde un esqueleto común.
# Se ejecuta a mano cuando haya que cambiar el diseño de todas a la vez.
import io, os

SALIDA = 'supabase/email-templates'
FUENTE = "'Trebuchet MS',Verdana,sans-serif"


def esqueleto(preview, titulo, cuerpo, accion, nota):
    """accion: HTML del bloque central (botón + enlace, o código)."""
    return f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF7F2;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preview}</div>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
        <tr>
          <td align="center" style="padding:8px 0 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td width="56" height="56" align="center" valign="middle" bgcolor="#3D5C3A" style="width:56px;height:56px;border-radius:16px;font-family:{FUENTE};font-size:26px;font-weight:bold;color:#FFFFFF;line-height:56px;">N</td>
              </tr>
            </table>
            <div style="font-family:{FUENTE};font-size:20px;font-weight:bold;color:#252525;padding-top:12px;letter-spacing:-0.2px;">Nido</div>
            <div style="font-family:{FUENTE};font-size:11px;font-weight:bold;color:#77716A;padding-top:4px;letter-spacing:2px;text-transform:uppercase;">Familia en calma</div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#FFFFFF;border:1px solid #EDE9E3;border-radius:24px;padding:40px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:{FUENTE};font-size:24px;line-height:32px;font-weight:bold;color:#252525;padding-bottom:16px;">{titulo}</td>
              </tr>
              <tr>
                <td style="font-family:{FUENTE};font-size:15px;line-height:24px;color:#77716A;padding-bottom:32px;">{cuerpo}</td>
              </tr>
{accion}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF8EF;border-radius:16px;">
              <tr>
                <td style="font-family:{FUENTE};font-size:13px;line-height:20px;color:#77716A;padding:16px 20px;">{nota}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:{FUENTE};font-size:12px;line-height:20px;color:#A39B93;padding:28px 16px 8px 16px;">
            Nido es un espacio privado para tu familia.<br>Solo vosotros veis vuestros datos.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
'''


def boton(texto):
    """Botón + enlace copiable. Tabla con bgcolor para que Outlook lo pinte."""
    return f'''              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="#5C7A59" style="border-radius:16px;">
                        <a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;padding:16px 40px;font-family:{FUENTE};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:16px;">{texto}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="font-family:{FUENTE};font-size:13px;line-height:20px;color:#77716A;border-top:1px solid #EDE9E3;padding-top:24px;">
                  Si el botón no funciona, copia esta dirección en tu navegador:<br>
                  <a href="{{{{ .ConfirmationURL }}}}" style="color:#5C7A59;word-break:break-all;">{{{{ .ConfirmationURL }}}}</a>
                </td>
              </tr>'''


def codigo():
    """Bloque para el código de un solo uso (reautenticación)."""
    return f'''              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="#F5F9F5" style="border-radius:16px;border:1px solid #DDEAD9;padding:20px 40px;font-family:{FUENTE};font-size:32px;font-weight:bold;color:#3D5C3A;letter-spacing:8px;">{{{{ .Token }}}}</td>
                    </tr>
                  </table>
                </td>
              </tr>'''


PLANTILLAS = {
    'confirmacion.html': dict(
        preview='Confirma tu correo y entra en Nido, el espacio privado de tu familia.',
        titulo='Confirma tu correo',
        cuerpo='Ya casi está. Pulsa el botón para confirmar esta dirección y terminar de crear tu cuenta.',
        accion=boton('Confirmar mi correo'),
        nota='El enlace caduca en unas horas y solo puede usarse una vez. Si tú no has creado ninguna cuenta, puedes ignorar este mensaje sin hacer nada.',
    ),
    'invitacion.html': dict(
        preview='Te han invitado a la familia en Nido.',
        titulo='Te han invitado a Nido',
        cuerpo='Alguien de tu familia quiere compartir contigo su calendario, sus listas, las comidas y los documentos de casa. Pulsa el botón para entrar y unirte.',
        accion=boton('Unirme a la familia'),
        nota='El enlace caduca y solo puede usarse una vez. Si no esperabas esta invitación, puedes ignorar este mensaje sin hacer nada.',
    ),
    'magic-link.html': dict(
        preview='Tu enlace para entrar en Nido.',
        titulo='Tu enlace para entrar',
        cuerpo='Pulsa el botón y entrarás en Nido sin necesidad de escribir la contraseña.',
        accion=boton('Entrar en Nido'),
        nota='El enlace caduca en unos minutos y solo puede usarse una vez. Si no has pedido entrar, puedes ignorar este mensaje sin hacer nada.',
    ),
    'cambio-email.html': dict(
        preview='Confirma tu nueva dirección de correo en Nido.',
        titulo='Confirma tu nueva dirección',
        cuerpo='Has pedido cambiar el correo de tu cuenta de <strong style="color:#252525;">{{ .Email }}</strong> a <strong style="color:#252525;">{{ .NewEmail }}</strong>. Confírmalo para que el cambio surta efecto.',
        accion=boton('Confirmar el cambio'),
        nota='Hasta que confirmes, tu cuenta seguirá usando la dirección anterior. Si no has pedido este cambio, ignora este mensaje y avisa al resto de la familia.',
    ),
    'recuperar-password.html': dict(
        preview='Restablece la contraseña de tu cuenta de Nido.',
        titulo='Restablece tu contraseña',
        cuerpo='Pulsa el botón para elegir una contraseña nueva. Si entraste por invitación y aún no tienes ninguna, este es también el sitio para ponerte la primera.',
        accion=boton('Elegir contraseña nueva'),
        nota='El enlace caduca en una hora y solo puede usarse una vez. Si no has pedido cambiarla, ignora este mensaje: tu contraseña actual seguirá funcionando.',
    ),
    'reautenticacion.html': dict(
        preview='Tu código de confirmación de Nido.',
        titulo='Confirma que eres tú',
        cuerpo='Para completar la operación, escribe este código en la aplicación:',
        accion=codigo(),
        nota='El código caduca en unos minutos. Si no estabas haciendo nada en Nido, ignora este mensaje y cambia tu contraseña por precaución.',
    ),
}

os.makedirs(SALIDA, exist_ok=True)
for nombre, datos in PLANTILLAS.items():
    ruta = os.path.join(SALIDA, nombre)
    io.open(ruta, 'w', encoding='utf-8', newline='\n').write(esqueleto(**datos))
    print('generada', ruta)
